declare module "aws-iot-device-sdk-browser" {
  export interface DeviceOptions {
    region: string;
    host: string;
    protocol: string;
    accessKeyId?: string;
    secretKey?: string;
    sessionToken?: string;
    maximumReconnectTimeMs?: number;
    debug?: boolean;
  }

  export interface Device {
    /**
     * イベント登録
     */
    on(
      event: "connect" | "close" | "error" | "message",
      callback: (...args: any[]) => void
    ): void;

    /**
     * トピック購読
     */
    subscribe(topic: string | string[]): void;

    /**
     * メッセージ送信
     */
    publish(topic: string, message: string | object): void;

    /**
     * クライアントを切断
     * @param force trueの場合、保留中のメッセージを破棄して即切断
     * @param options オプション（通常は空オブジェクト）
     * @param callback 切断完了後に呼ばれるコールバック
     */
    end(force?: boolean, options?: object, callback?: () => void): void;
  }

  /**
   * AWS IoT デバイス作成
   */
  export function device(options: DeviceOptions): Device;
}