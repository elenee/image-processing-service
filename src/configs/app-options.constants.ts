import { CacheModuleAsyncOptions } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-store";

export const RedisOptions: CacheModuleAsyncOptions = {
    isGlobal: true,
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
            socket: {
                host: process.env.REDIS_HOST!,
                port: process.env.REDIS_PORT!,
            },
            ttl: 300000,
        });
        return {
            store: () => store,
        };
    },
    inject: [ConfigService]
}