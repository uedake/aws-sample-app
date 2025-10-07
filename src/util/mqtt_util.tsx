import { mqtt5, auth, iot } from 'aws-iot-device-sdk-v2/dist/browser';
import { toUtf8 } from "@aws-sdk/util-utf8-browser";
import { AWSCredentials } from "@aws-amplify/core/dist/esm/singleton/Auth/types"

class AWSCognitoCredentialsProvider extends auth.CredentialsProvider {
    creds: AWSCredentials;
    region: string;
    constructor(creds: AWSCredentials, region: string) {
        super();
        this.creds = creds;
        this.region = region;

        //creds.expirationを見てrefreshすべき
        setInterval(async () => {
            await this.refreshCredentials();
        }, 3600 * 1000);
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
        console.warn('refresh not implememnted yet');
    }
}

export class MqttManager {
    config: mqtt5.Mqtt5ClientConfig
    provider: AWSCognitoCredentialsProvider

    constructor(region: string, endpoint: string, creds: AWSCredentials) {
        this.provider = new AWSCognitoCredentialsProvider(
            creds, region
        );

        const builder = iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
            endpoint,
            {
                credentialsProvider: this.provider,
                region: region
            }
        ).withConnectProperties({
            keepAliveIntervalSeconds: 10,
            clientId:"k-ueda-1"
        });

        this.config = builder.build()
        console.log("config", this.config)
    }
    async connect() {
        /** Make sure the credential provider fetched before setup the connection */
        await this.provider.refreshCredentials();
        const client = new mqtt5.Mqtt5Client(this.config)
        client.on('error', (error) => {
            console.log("Error event: " + error.toString());
        });

        client.on("messageReceived", (eventData: mqtt5.MessageReceivedEvent): void => {
            console.log("Message Received event: " + JSON.stringify(eventData.message));
            if (eventData.message.payload) {
                console.log("  with payload: " + toUtf8(eventData.message.payload as Buffer));
            }
        });

        client.on('attemptingConnect', (eventData: mqtt5.AttemptingConnectEvent) => {
            console.log("Attempting Connect event");
        });

        client.on('connectionSuccess', (eventData: mqtt5.ConnectionSuccessEvent) => {
            console.log("Connection Success event");
            console.log("Connack: " + JSON.stringify(eventData.connack));
            console.log("Settings: " + JSON.stringify(eventData.settings));
        });

        client.on('connectionFailure', (eventData: mqtt5.ConnectionFailureEvent) => {
            console.log("Connection failure event: " + eventData.error.toString());
        });

        client.on('disconnection', (eventData: mqtt5.DisconnectionEvent) => {
            console.log("Disconnection event: " + eventData.error.toString());
            if (eventData.disconnect !== undefined) {
                console.log('Disconnect packet: ' + JSON.stringify(eventData.disconnect));
            }
        });

        client.on('stopped', (eventData: mqtt5.StoppedEvent) => {
            console.log("Stopped event");
        });

        return client;
    }
}