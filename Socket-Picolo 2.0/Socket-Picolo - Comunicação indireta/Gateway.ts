// Gateway que recebe leituras dos bairros e reencaminha para a cloud usando comunicação indireta (ex.: arquivos/fila).

import * as net from 'net';
import { producers } from './configurations';


(async () => {
  try {
    await producers.connect();
    console.log('[Gateway.ts] Kafka Producer conectado no Gateway');
  } catch (error) {
    console.error('Erro conectando producer:', error);
  }
})();


const cloudClients = new Set<net.Socket>();


const writeToClouds = async (obj: any) => {
  try {
    await producers.send({
      topic: 'TopicA',
      messages: [{ 
        key: 'gateway', 
        value: JSON.stringify(obj) 
      }]
    });
    console.log('[Gateway.ts] Gateway → Kafka TopicA:', obj);
  } catch (error) {
    console.error('Erro enviando para Kafka:', error);
  }
};


function conectarServidor(host: string, porta: number) {
  const client = net.createConnection({ host, port: porta }, () =>
    console.log(`[Gateway.ts] Conectado ao bairro na porta ${porta}`)
  );

  let buffer = '';
  client.on('data', (mensagem: Buffer) => {
    buffer += mensagem.toString('utf8');
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const linha of parts) {
      const trimmed = linha.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        console.log(`[Gateway.ts] Bairro ${porta} ->`, obj);
        writeToClouds({ origem: `bairro_${porta}`, ...obj });
      } catch {
        console.warn('');
      }
    }
  });

  client.on('close', () => console.log(`[Gateway.ts] Conexão fechada com bairro ${porta}`));
  client.on('error', err => console.error(`Erro no bairro ${porta}:`, err.message));
  return client;
}


[4001,4002,4003,4004,4005].map(p => conectarServidor('127.0.0.1', p));


const porta = 4034;
const server = net.createServer(socket => {
  cloudClients.add(socket);
  socket.write(`Conectado ao Gateway. Cliente: ${socket.remoteAddress}:${socket.remotePort}\n`);
  socket.on('data', msg => console.log('[Gateway.ts] Mensagem da Cloud:', msg.toString('utf8')));
  socket.on('close', () => {
    cloudClients.delete(socket);
    console.log('[Gateway.ts] Cloud desconectada');
  });
  socket.on('error', err => console.error('Erro no socket da Cloud:', err.message));
});

server.listen(porta, () => console.log(`[Gateway.ts] Gateway rodando na porta ${porta}`));
