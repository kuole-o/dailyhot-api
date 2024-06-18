import type { ListContext } from "../types.js";
type Response = {
    code: number;
    message: string;
    objectId: string;
    createdAt: string;
};
export declare const handleRoute: (c: ListContext, noCache: boolean) => Promise<Response>;
export {};
//# sourceMappingURL=newbbtalk.d.ts.map