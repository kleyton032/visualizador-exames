import { OracleConnection } from './OracleConnection';
import oracledb from 'oracledb';

// Mock oracledb
jest.mock('oracledb', () => ({
    createPool: jest.fn(),
    getConnection: jest.fn(),
    outFormat: {
        OBJECT: 4002
    }
}));

describe('OracleConnection', () => {
    let oracleConnection: OracleConnection;

    beforeEach(() => {
        jest.clearAllMocks();
        oracleConnection = OracleConnection.getInstance();

        process.env.ORACLE_USER = 'test_user';
        process.env.ORACLE_PASSWORD = 'test_password';
        process.env.ORACLE_CONNECTION = 'localhost:1521/XE';
    });

    afterEach(async () => {
        await oracleConnection.close();

        (OracleConnection as any).instance = null;
    });

    it('should be a singleton', () => {
        const instance1 = OracleConnection.getInstance();
        const instance2 = OracleConnection.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should initialize the connection pool', async () => {
        const mockPool = {
            close: jest.fn()
        };
        (oracledb.createPool as jest.Mock).mockResolvedValue(mockPool);

        await oracleConnection.initialize();

        expect(oracledb.createPool).toHaveBeenCalledWith(expect.objectContaining({
            user: expect.any(String),
            password: expect.any(String),
            connectString: expect.any(String)
        }));
    });

    it('should execute a query', async () => {
        const mockConnection = {
            execute: jest.fn().mockResolvedValue({ rows: [] }),
            close: jest.fn().mockResolvedValue(undefined)
        };
        const mockPool = {
            getConnection: jest.fn().mockResolvedValue(mockConnection),
            close: jest.fn()
        };

        (oracledb.createPool as jest.Mock).mockResolvedValue(mockPool);
        await oracleConnection.initialize();

        const sql = 'SELECT * FROM DUAL';
        await oracleConnection.execute(sql);

        expect(mockPool.getConnection).toHaveBeenCalled();
        expect(mockConnection.execute).toHaveBeenCalledWith(sql, [], expect.any(Object));
        expect(mockConnection.close).toHaveBeenCalled();
    });
});
