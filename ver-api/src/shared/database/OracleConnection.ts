import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.db' });

export class OracleConnection {
    private static instance: OracleConnection;
    private pool: oracledb.Pool | null = null;

    private constructor() { }

    public static getInstance(): OracleConnection {
        if (!OracleConnection.instance) {
            OracleConnection.instance = new OracleConnection();
        }
        return OracleConnection.instance;
    }

    public async initialize(): Promise<void> {
        if (this.pool) {
            return;
        }

        try {
            try {
                oracledb.initOracleClient();
            } catch (err: any) {
                if (err.message.includes('DPI-1047')) {
                    console.error('Error initializing Thick Mode: Oracle Client libraries not found in PATH.', err.message);
                } else if (err.message.includes('NJS-009')) {
                } else {
                    console.error('Error initializing Thick Mode:', err);
                }
            }

            const user = process.env.ORACLE_USER;
            const password = process.env.ORACLE_PASSWORD;
            const connectString = process.env.ORACLE_CONNECTION;

            this.pool = await oracledb.createPool({
                user,
                password,
                connectString,
            });
            console.log('Oracle Pool initialized');
        } catch (error) {
            console.error('Error initializing Oracle Pool:', error);
            throw error;
        }
    }

    public async execute<T>(sql: string, binds: oracledb.BindParameters = [], options: oracledb.ExecuteOptions = {}): Promise<oracledb.Result<T>> {
        if (!this.pool) {
            await this.initialize();
        }

        let connection: oracledb.Connection | undefined;

        try {
            connection = await this.pool!.getConnection();

            const result = await connection.execute<T>(sql, binds, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                ...options,
            });

            return result;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    }

    public async close(): Promise<void> {
        if (this.pool) {
            try {
                await this.pool.close(10);
                this.pool = null;
                console.log('Oracle Pool closed');
            } catch (error) {
                console.error('Error closing Oracle Pool:', error);
                throw error;
            }
        }
    }
}
