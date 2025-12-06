import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as proto from "protobufjs";
import type { EachMessagePayload } from 'kafkajs';
import { consumersA } from './configurations';

export async function carregarProto() {
  const root = await proto.load("sensor.proto");
  const Envelope = root.lookupType("Envelope");
  return Envelope;
}

export function encodeEnvelope(Envelope: any, obj: any): Buffer {
  const err = Envelope.verify(obj);
  if (err) throw new Error(err);
  const message = Envelope.encode(Envelope.create(obj)).finish();
  const size = Buffer.alloc(4);
  size.writeUInt32BE(message.length, 0);
  return Buffer.concat([size, Buffer.from(message)]);
}

export function decodeStream(
  buffer: Buffer,
  Envelope: any,
  onMessage: (msg: any) => void
): Buffer {
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const size = buffer.readUInt32BE(offset);
    if (buffer.length - offset - 4 < size) break;
    const chunk = buffer.slice(offset + 4, offset + 4 + size);
    const msg = Envelope.decode(chunk);
    onMessage(msg);
    offset += 4 + size;
  }
  return buffer.slice(offset);
}

const banco = path.join(process.cwd(), "banco.ndjson");

async function iniciar() {
  const Envelope = await carregarProto();

  // Conectar ao Calculator RPC (ORIGINAL)
  const calc = net.createConnection({ host: "127.0.0.1", port: 4010 }, () =>
    console.log("Cloud conectada ao Calculator (RPC)")
  );

  let calcBuffer = Buffer.alloc(0);
  calc.on("data", data => {
    calcBuffer = Buffer.concat([calcBuffer, data]);
    calcBuffer = decodeStream(calcBuffer, Envelope, msg => {
      if (!msg.media) return;
      const m = msg.media;
      console.log(
        `MÉDIA (${m.origem}) ➜ T: ${m.temperatura.toFixed(2)} | U: ${m.umidade.toFixed(2)} | I: ${m.insolacao.toFixed(2)} (amostras: ${m.amostras})`
      );
    });
  });
  calc.on("error", err => console.log("Erro Calc:", err.message));

  // KAFKA CONSUMER (NOVA PARTE - substitui conectarGateway)
  (async () => {
    try {
      await consumersA.connect();
      await consumersA.subscribe({ topic: 'TopicA', fromBeginning: true });
      
      await consumersA.run({ 
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          const value = message.value?.toString();
          if (!value) return;
          
          try {
            const obj = JSON.parse(value);
            
            // EXATAMENTE O MESMO CÓDIGO do conectarGateway original
            fs.appendFile(banco, JSON.stringify(obj) + "\n", () => {});
            const pacote = { amostra: obj };
            calc.write(encodeEnvelope(Envelope, pacote));
            
            console.log(`Kafka TopicA → Cloud:`, obj);
          } catch {
            console.log('Mensagem Kafka inválida');
          }
        }
      });
      console.log('Kafka Consumer conectado na Cloud');
    } catch (error) {
      console.error('Erro Consumer Kafka:', error);
    }
  })();
}

iniciar();
