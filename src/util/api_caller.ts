import axios from "axios";

export interface HttpRequestParam {
    pathParams?: string[]
    queryParams?: object
    bodyParams?: object
}

export class ApiCaller {
    branch: string
    token?: string
    constructor(branch: string, token?: string) {
        this.branch = branch
        this.token = token
    }

    async call(method: "GET" | "POST", apiFuncName: string, param?: HttpRequestParam) {
        let url = `https://sample-api.wal-test.com/`
        if (this.branch && this.branch !== "main") {
            url += this.branch + "/"
        }
        url += apiFuncName

        if (param && param.pathParams) {
            for (const value of param.pathParams) {
                url += `/${value}`
            }
        }

        const config = {
            headers: {
                Authorization: this.token,
            },
            params: param?.queryParams
        }

        try {
            let res
            if (method == "GET") {
                res = await axios.get(url, config)
            }
            else if (method == "POST") {
                res = await axios.post(url, param?.bodyParams, config);
            }
            else {
                console.error("enum error");
                return
            }
            console.log(res.data);
            return res?.data
        }
        catch (err: any) {
            console.error("API error:", err.response?.status, err.message);
            return err.message
        }
    }
}

