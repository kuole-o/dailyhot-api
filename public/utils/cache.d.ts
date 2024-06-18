interface GetCache<T> {
    updateTime: string;
    data: T;
}
export declare const getCache: <T>(key: string) => GetCache<T> | undefined;
export declare const setCache: <T>(key: string, value: T, ttl?: number) => boolean;
export declare const delCache: (key: string) => number;
export {};
//# sourceMappingURL=cache.d.ts.map