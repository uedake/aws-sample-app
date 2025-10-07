import React, { useEffect, useState, useRef } from "react";
import {once} from "events";
import { AWSCredentials } from "@aws-amplify/core/dist/esm/singleton/Auth/types"
import { mqtt5 } from 'aws-iot-device-sdk-v2/dist/browser';

import { configureAWS, REGION, IOT_ENDPOINT, branch } from "./config";
import { MqttManager } from "./util/mqtt_util";

configureAWS();

type Props = {
  creds: AWSCredentials;
};

const App: React.FC<Props> = ({ creds }) => {
  const [message, setMessage] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const clientRef = useRef<mqtt5.Mqtt5Client | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const mqtt = new MqttManager(REGION, IOT_ENDPOINT, creds)

        const client = await mqtt.connect();
        clientRef.current = client

        const attemptingConnect = once(client, "attemptingConnect");
        const connectionSuccess = once(client, "connectionSuccess");
        client.start()

        await attemptingConnect;
        await connectionSuccess;
        
        const topic = `sample-service/${branch}/test`

        // const suback = await client.subscribe({
        //   subscriptions: [
        //     { qos: mqtt5.QoS.AtMostOnce, topicFilter: topic }
        //   ]
        // });
        // console.log('Suback result: ' + JSON.stringify(suback));
      } catch (err) {
        console.error("Error initializing app:", err);
      }
    };

    init();

    // クリーンアップ
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
      }
    };
  }, []);

  const handleDisconnect = async () => {
    try {
      // MQTT 切断
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }

      // 状態リセット
      setMessage([]);
      setConnected(false);
      console.log("disconnect successfully");
    } catch (err) {
      console.error("Error disconnect:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Mqtt Demo</h1>
      <p>接続中ブランチ:{branch}</p>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
      <p>Received message: {message}</p>
      <button onClick={handleDisconnect}>Disconnect</button>
    </div>
  );
};

export default App;
