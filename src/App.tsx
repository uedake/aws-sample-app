import React, { useEffect, useState, useRef } from "react";
import { AuthSession, AuthUser } from "@aws-amplify/auth";

import { configureAWS, REGION, IOT_ENDPOINT, branch } from "./config";
import { MqttManager } from "./util/mqtt_util";
import { ApiCaller, HttpRequestParam } from "./util/api_caller"
import { ConsoleLogger } from "@aws-amplify/core";
ConsoleLogger.LOG_LEVEL = "DEBUG"

configureAWS();

type Props = {
  session: AuthSession;
  user: AuthUser;
  refreshAuth: (force: boolean) => Promise<void>
};

const App: React.FC<Props> = ({ session, user, refreshAuth }) => {
  const [messageList, setMessageList] = useState<string[]>([]);
  const [mqttState, setMqttState] = useState<"INIT" | "CONNECTING" | "CONNECTED" | "SUBSCRIBED" | "DISCONNECT">("DISCONNECT");
  const [subTopic, setSubTopic] = useState<string | undefined>(`sample-service/${branch}/sample`)
  const prevSubTopic = useRef<string | undefined>(undefined);

  const mqttRef = useRef<MqttManager>(undefined);
  const apiCallerRef = useRef<ApiCaller>(undefined);
  apiCallerRef.current = new ApiCaller(branch, session.tokens?.accessToken.toString())
  useEffect(() => {
    console.warn("session changed")
    setMqttState("INIT")
    return () => {
      console.warn("session unmounted")
      if (mqttRef.current) {
        mqttRef.current.stop()
      }
      mqttRef.current = undefined
    };
  }, [session]);
  useEffect(() => {
    switchSubTopic()
  }, [subTopic])
  useEffect(() => {
    if (mqttState == "INIT") {
      try {
        if (!session.credentials) {
          console.error("need credentials")
          return
        }
        mqttRef.current = new MqttManager(
          REGION,
          IOT_ENDPOINT,
          session.credentials,
          refreshAuth,
          async () => {
            const api = apiCallerRef.current
            const response = await api?.call("GET", "permit_iotcore_access", {
              queryParams: {
                cognitoIdentityId: session.identityId
              }
            })
            if (!response["result"]) {
              console.error("fail to attach policy")
              return false
            }
            return true
          },
          (clientId: string) => {
            if (clientId == mqttRef.current?.clientId) {
              setMqttState("CONNECTED")
            }
            else {
              console.warn("callback called for old client")
            }
          },
          (clientId: string) => {
            if (clientId == mqttRef.current?.clientId) {
              setMqttState("DISCONNECT")
            }
            else {
              console.warn("callback called for old client")
            }
          }
        )
        console.log(`change mqtt client: ${mqttRef.current.clientId}`)
      } catch (err) {
        console.error("Fail initializing app:", err);
      }
    }
    else if (mqttState == "CONNECTED") {
      switchSubTopic()
    }
  }, [mqttState])

  const switchSubTopic = async () => {
    if (mqttRef.current && mqttRef.current.client.isConnected()) {
      if (prevSubTopic.current) {
        mqttRef.current.unsubscribe(prevSubTopic.current)
        prevSubTopic.current = undefined
      }
      if (subTopic) {
        setMessageList([]);
        const result = await mqttRef.current.subscribe(subTopic, (obj) => {
          setMessageList((prev) => [...prev, JSON.stringify(obj)])
        })
        if (result) {
          prevSubTopic.current = subTopic
          setMqttState("SUBSCRIBED")
        }
        else {
          setMqttState("CONNECTED")
        }
      }
      else {
        setMqttState("CONNECTED")
      }
    }

  }
  const callApi = async (
    method: "GET" | "POST",
    funcName: string,
    pathParamsId?: string,
    queryParamsIdList?: string[]
  ) => {
    let param: HttpRequestParam = {
    }
    if (pathParamsId) {
      const input = document.getElementById(pathParamsId) as HTMLInputElement
      param["pathParams"] = input.value.split("/")
    }
    if (queryParamsIdList) {
      let dic: Record<string, any> = {}
      for (const id of queryParamsIdList) {
        const input = document.getElementById(id) as HTMLInputElement
        dic[input.name] = input.value
      }
      param["queryParams"] = dic
    }
    const api = apiCallerRef.current
    const response = await api?.call(method, funcName, param)
    const pre = document.getElementById("response");
    if (pre) {
      pre.innerText = JSON.stringify(response)
    }
  }

  const connectMqtt = async (): Promise<boolean> => {
    setMqttState("CONNECTING")
    console.log(`start ${mqttRef.current?.clientId}`)
    const result = await mqttRef.current!.start()
    return result
  }

  const disconnectMqtt = async (): Promise<boolean> => {
    return await mqttRef.current!.stop()
  };

  const publish = async (topicId: string, payloadId: string) => {
    const input = document.getElementById(topicId) as HTMLInputElement
    const textarea = document.getElementById(payloadId) as HTMLTextAreaElement
    await mqttRef.current?.publish(
      input.value,
      JSON.parse(textarea.value)

    )
  }

  return (
    <div style={{ padding: 20 }}>
      <p>接続中ブランチ:{branch}</p>
      <table border={1}>
        <thead>
          <tr>
            <td>認証</td>
            <td>状態</td>
            <td>期限</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ユーザー</td>
            <td>{session.tokens ? `成功(${user.username})` : "失敗"}</td>
            <td>{new Date(session.tokens?.accessToken?.payload?.exp! * 1000).toLocaleTimeString()}</td>
          </tr>
          <tr>
            <td>ID</td>
            <td>{session.identityId ? `成功(${session.identityId})` : "失敗"}</td>
            <td>{new Date(session.tokens?.idToken?.payload?.exp! * 1000).toLocaleTimeString()}</td>
          </tr>
          <tr>
            <td>IAM</td>
            <td>{session.credentials ? `成功` : "失敗"}</td>
            <td>{session.credentials?.expiration?.toLocaleTimeString()}</td>
          </tr>
        </tbody>
      </table>
      <h1>WebAPI Demo</h1>
      <div>
        <button onClick={() => callApi("GET", "echo", "echo_path_param")}>echo</button>
        <button onClick={() => callApi("GET", "echo_with_auth", "echo_path_param")}>echo(要認証)</button>
        <input id="echo_path_param" defaultValue="aaa" type="text" />
      </div>
      <div>
        <button onClick={() => callApi("GET", "numpy", "numpy_path_param", ["numpy_query_param"])}>numpy</button>
        <input id="numpy_path_param" defaultValue="3" type="text" />
        <input id="numpy_query_param" name="val" defaultValue="5" type="text" />
      </div>

      <p>response</p>
      <pre id="response"></pre>
      <h1>Mqtt Demo</h1>
      <div>
        {
          ["INIT", "DISCONNECT"].includes(mqttState)
            ? <button onClick={connectMqtt}>Connect</button>
            : <button onClick={disconnectMqtt}>Disconnect</button>
        }
        <span> Status: {mqttState}</span>
      </div>
      <div>
        <span>Subscribed topic:</span>
        <input id="mqtt_sub_topic" value={subTopic} onChange={(elem) => setSubTopic(elem.target.value)} type="text" />
        <pre style={{ backgroundColor: "gray" }}>{messageList.join("\n")}</pre>
      </div>
      <div>
        <button onClick={() => publish("mqtt_pub_topic", "payload_json")}>Publish</button>
        <input id="mqtt_pub_topic" name="val" defaultValue={`sample-service/${branch}/sample`} type="text" />
        <br />
        <textarea style={{ width: "100%" }} id="payload_json" defaultValue='{"text":"sample"}' />
      </div>
    </div>
  );
};

export default App;
