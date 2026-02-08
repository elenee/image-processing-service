import { RmqOptions, Transport } from '@nestjs/microservices';
export const rabbitMQConfig = (): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL!],
    queue: 'image_queue',
    queueOptions: {
      durable: true,
    },
  },
});
