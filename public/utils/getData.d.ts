import type { Get, Post, Web } from "../types.js";
import { Cluster } from "puppeteer-cluster";
export declare const createCluster: () => Promise<Cluster<any, any>>;
export declare const get: (options: Get) => Promise<{
    fromCache: boolean;
    data: any;
    updateTime: string;
}>;
export declare const post: (options: Post) => Promise<{
    fromCache: boolean;
    data: any;
    updateTime: string;
}>;
export declare const web: (options: Web) => Promise<{
    fromCache: boolean;
    data: any;
    updateTime: string;
}>;
//# sourceMappingURL=getData.d.ts.map