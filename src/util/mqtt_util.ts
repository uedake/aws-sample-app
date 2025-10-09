import { toUtf8 } from "@aws-sdk/util-utf8-browser";
import { AWSCredentials } from "@aws-amplify/core/dist/esm/singleton/Auth/types"
import { mqtt5, auth, iot } from 'aws-iot-device-sdk-v2/dist/browser';
import { once } from "events";

class AWSCognitoCredentialsProvider extends auth.CredentialsProvider {
    creds: AWSCredentials;
    region: string;
    refreshAuth: (force: boolean) => Promise<void>;

    constructor(creds: AWSCredentials, region: string, refreshAuth: (force: boolean) => Promise<void>) {
        super();
        this.creds = creds;
        this.region = region;
        this.refreshAuth = refreshAuth;
    }

    getCredentials(): auth.AWSCredentials {
        return {
            aws_access_id: this.creds.accessKeyId,
            aws_secret_key: this.creds.secretAccessKey,
            aws_sts_token: this.creds.sessionToken,
            aws_region: this.region
        }
    }

    async refreshCredentials() {
        // refreshAuthによってstateが代わりAWSCognitoCredentialsProviderを再作成される
        await this.refreshAuth(true)
    }
}


export class MqttManager {
    active: boolean = false;
    clientId: string
    client: mqtt5.Mqtt5Client
    messageCallbacks: Record<string, (obj: object) => void> = {}
    autoConnect: boolean;

    constructor(
        region: string,
        endpoint: string,
        creds: AWSCredentials,
        refreshAuth: (force: boolean) => Promise<void>,
        onConnected?: (clientId: string) => void,
        onDisconnected?: (clientId: string) => void,
        autoConnect = true
    ) {
        this.autoConnect = autoConnect
        this.clientId = `k-ueda-${Date.now()}`
        const provider = new AWSCognitoCredentialsProvider(
            creds, region, refreshAuth
        );

        const builder = iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
            endpoint,
            {
                credentialsProvider: provider,
                region: region
            }
        ).withConnectProperties({
            keepAliveIntervalSeconds: 10,
            clientId: this.clientId,
            sessionExpiryIntervalSeconds: 0
        });

        const config = builder.build()

        const client = new mqtt5.Mqtt5Client(config)
        client.on('error', (error) => {
            console.log(`[${this.clientId}] Error: ${error.toString()}`);
            if (onDisconnected) {
                onDisconnected(this.clientId)
            }
        });

        client.on("messageReceived", (eventData: mqtt5.MessageReceivedEvent): void => {
            console.log(`[${this.clientId}] Message: ${eventData.message.topicName}`);
            if (eventData.message.payload) {
                const json = toUtf8(eventData.message.payload as Buffer)
                console.log("  with payload: " + json);
                const obj = JSON.parse(json)
                if (this.messageCallbacks[eventData.message.topicName]) {
                    this.messageCallbacks[eventData.message.topicName](obj)
                }
            }
        });

        client.on('attemptingConnect', (eventData: mqtt5.AttemptingConnectEvent) => {
            console.log(`[${this.clientId}] Attempting Connect`);
        });

        client.on('connectionSuccess', (eventData: mqtt5.ConnectionSuccessEvent) => {
            if (this.active) {
                console.log(`[${this.clientId}] Connection Success`);
                if (onConnected) {
                    onConnected(this.clientId)
                }
            }
            else {
                console.log(`[${this.clientId}] Unintended Connection Success. Now disconnect`);
                client.stop();
            }
        });

        client.on('connectionFailure', (eventData: mqtt5.ConnectionFailureEvent) => {
            console.log(`[${this.clientId}] Connection failure:  + ${eventData.error.toString()}`);
            if (onDisconnected) {
                onDisconnected(this.clientId)
            }
        });

        client.on('disconnection', (eventData: mqtt5.DisconnectionEvent) => {
            console.log(`[${this.clientId}] Disconnection: ${eventData.disconnect?.reasonCode}`);
            if (eventData.disconnect !== undefined) {
                console.log('Disconnect packet: ' + JSON.stringify(eventData.disconnect));
            }
            if (onDisconnected) {
                onDisconnected(this.clientId)
            }
        });

        client.on('stopped', (eventData: mqtt5.StoppedEvent) => {
            console.log(`[${this.clientId}] Stopped`);
        });
        this.client = client
        if (this.autoConnect) {
            this.start()
        }
    }
    async start() {
        try {
            this.active = true
            const client = this.client
            client.start()
            const result = await Promise.race([
                once(client, "connectionSuccess").then((eventData) => true),
                once(client, "connectionFailure").then((eventData) => false),
                once(client, "error").then((eventData) => false),
            ]);
            console.log('Connected:', result);
            return result
        } catch (err) {
            this.active = false
            console.error("Error connect:", err);
            return false
        }
    }
    async stop() {
        this.active = false
        try {
            const client = this.client
            // MQTT 切断
            client.stop();
            await once(client, "stopped");
            console.log("disconnect successfully");
            return true
        } catch (err) {
            console.error("Error disconnect:", err);
            return false
        }
    }
    async unsubscribe(topicFilter: string) {
        this.client.unsubscribe({
            topicFilters: [topicFilter]
        })
    }
    async subscribe(topic: string, onMessageReceived: (obj: object) => void) {
        try {
            if (topic.includes("+") || topic.includes("#")) {
                throw Error("cannot use wild card in topic name yet.")
            }
            this.messageCallbacks[topic] = onMessageReceived
            const suback = await this.client.subscribe({
                subscriptions: [
                    { qos: 0, topicFilter: topic }
                ]
            });
            if (suback.reasonCodes.includes(mqtt5.SubackReasonCode.GrantedQoS0)) {
                console.log(`✅ Subscribed: ${topic}`);
                return true
            } else if (suback.reasonCodes.includes(mqtt5.SubackReasonCode.NotAuthorized)) {
                console.log(`❌ NotAuthorized: ${topic}`);
                return false
            }
            else {
                console.log(`❌ Rejected: ${topic}`);
                return true
            }
        } catch (err) {
            console.error(`❌ Error subscribe: ${topic}`, err);
            return false
        }
    }
    async publish(topic: string, payload: Record<string, unknown> | string) {
        try {
            const puback = await this.client.publish({
                topicName: topic,
                qos: 0,
                payload
            });
            console.log(`✅ Published: ${topic}`, puback);
            return true
        } catch (err) {
            console.error(`❌ Error publish: ${topic}`, err);
            return false
        }

    }
}


