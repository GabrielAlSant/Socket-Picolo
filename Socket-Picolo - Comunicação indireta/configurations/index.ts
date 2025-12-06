import {type KafkaConfig, logLevel, type Producer, type Consumer, Kafka} from 'kafkajs';

const kafkaConfig: KafkaConfig = {
    logLevel: logLevel.NOTHING,
    clientId: 'my-app',
    brokers: ['192.168.1.107:9092']
};

const kafka = new Kafka(kafkaConfig);

export const producers = kafka.producer();
export const consumersA = kafka.consumer({ groupId: 'consumerA' });
