export declare const extractRss: (content: string) => string | null;
export declare const parseRSS: (rssContent: string) => Promise<{
    title: string;
    link: string;
    pubDate: string;
    author: any;
    content: string;
    contentSnippet: string;
    guid: string;
    categories: string[];
}[]>;
//# sourceMappingURL=parseRSS.d.ts.map