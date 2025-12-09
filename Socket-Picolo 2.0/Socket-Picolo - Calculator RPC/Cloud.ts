// Serviço cloud que consome resultados do cálculo via RPC e cuida da persistência/exposição dos dados.

import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as proto from "protobufjs";

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

  
  const calc = net.createConnection({ host: "127.0.0.1", port: 4010 }, () =>
    console.log("[RPC/Cloud] Cloud conectada ao Calculator (RPC)")
  );

  let calcBuffer = Buffer.alloc(0);

  calc.on("data", data => {
    calcBuffer = Buffer.concat([calcBuffer, data]);
    calcBuffer = decodeStream(calcBuffer, Envelope, msg => {
      if (!msg.media) return;

      const m = msg.media;
      console.log(
        `[RPC/Cloud] MÉDIA (${m.origem}) ➜ T: ${m.temperatura.toFixed(
          2
        )} | U: ${m.umidade.toFixed(2)} | I: ${m.insolacao.toFixed(
          2
        )}  (amostras: ${m.amostras})`
      );
    });
  });

  calc.on("error", err => console.log("[RPC/Cloud] Erro Calc:", err.message));

  
  conectarGateway(Envelope, calc);
}

function conectarGateway(Envelope: any, calc: net.Socket) {
  const client = net.createConnection(
    { host: "127.0.0.1", port: 4034 },
    () => console.log("[RPC/Cloud] Conectado ao Gateway (4034)")
  );

  let buffer = "";

  client.on("data", data => {
    buffer += data.toString("utf8");
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";

    for (const linha of parts) {
      const trimmed = linha.trim();
      if (!trimmed) continue;

      try {
        const obj = JSON.parse(trimmed);

        
        fs.appendFile(banco, JSON.stringify(obj) + "\n", () => {});

        
        const pacote = { amostra: obj };
        calc.write(encodeEnvelope(Envelope, pacote));
      } catch {
        console.log("[RPC/Cloud] Linha inválida:", trimmed);
      }
    }
  });

  client.on("error", err =>
    console.log("[RPC/Cloud] Erro Gateway:", err.message)
  );
}

iniciar();
