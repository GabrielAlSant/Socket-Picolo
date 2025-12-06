import {type KafkaConfig, logLevel, type Producer, type Consumer, Kafka} from 'kafkajs';

const kafkaConfig: KafkaConfig = {
    logLevel: logLevel.NOTHING,
    clientId: 'my-app',
    brokers: ['127.0.0.1:9092']
};

const kafka = new Kafka(kafkaConfig);

export const producers = kafka.producer();
export const consumersA = kafka.consumer({ groupId: 'consumerA' });
