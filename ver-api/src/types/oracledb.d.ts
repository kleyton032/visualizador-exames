declare module 'oracledb' {
    export const OUT_FORMAT_OBJECT: number;
    export let outFormat: number;
    export interface ExecuteOptions {
        outFormat?: number;
        [key: string]: any;
    }
    export interface Result<T> {
        rows?: T[];
        [key: string]: any;
    }
    export interface Connection {
        execute<T>(sql: string, binds?: any[], options?: ExecuteOptions): Promise<Result<T>>;
        close(): Promise<void>;
    }
    export interface Pool {
        getConnection(): Promise<Connection>;
        close(force?: number): Promise<void>;
    }
    export function createPool(poolAttributes: any): Promise<Pool>;
}
