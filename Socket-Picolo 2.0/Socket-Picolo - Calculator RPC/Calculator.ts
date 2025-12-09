// Serviço de cálculo exposto como servidor RPC, responsável por manter acumuladores e retornar médias.

import * as net from "net";

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


const porta = 4010;

const acumuladores = new Map<
  string,
  { sumT: number; sumU: number; sumI: number; count: number }
>();

async function iniciar() {
  const Envelope = await carregarProto();

  const server = net.createServer(socket => {
    console.log(`[RPC/Calculator] 🔌 Nova conexão: ${socket.remoteAddress}:${socket.remotePort}`);
    socket.write("Calculator pronto (RPC Protobuf)\n");

    let buffer = Buffer.alloc(0);

    socket.on("data", data => {
      buffer = Buffer.concat([buffer, data]);

      buffer = decodeStream(buffer, Envelope, msg => {
        if (!msg.amostra) return;

        const a = msg.amostra;
        const origem = a.origem || "desconhecido";

        console.log(`[RPC/Calculator] 📥 Recebida amostra de "${origem}" → T:${a.temperatura} U:${a.umidade} I:${a.insolacao}`);

        const acc =
          acumuladores.get(origem) ??
          { sumT: 0, sumU: 0, sumI: 0, count: 0 };

        acc.sumT += a.temperatura;
        acc.sumU += a.umidade;
        acc.sumI += a.insolacao;
        acc.count++;

        acumuladores.set(origem, acc);

        const media = {
          origem,
          temperatura: acc.sumT / acc.count,
          umidade: acc.sumU / acc.count,
          insolacao: acc.sumI / acc.count,
          amostras: acc.count,
        };

        console.log(
          `[RPC/Calculator] 📊 Média atualizada (${origem}) → T:${media.temperatura.toFixed(2)} ` +
            `U:${media.umidade.toFixed(2)} I:${media.insolacao.toFixed(2)} ` +
            `(amostras: ${media.amostras})`
        );

        socket.write(encodeEnvelope(Envelope, { media }));

        console.log(`[RPC/Calculator] 📤 Média enviada ao cliente (${origem})`);
      });
    });

    socket.on("close", () => {
      console.log(`[RPC/Calculator] ❌ Cliente desconectou: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on("error", err => {
      console.log(`[RPC/Calculator] ⚠️ Erro no socket: ${err.message}`);
    });
  });

  server.listen(porta, () =>
    console.log(`[RPC/Calculator] 🚀 Calculator RPC executando na porta ${porta}`)
  );
}

iniciar();
