import * as net from 'net';
import { producers } from './configurations';

// Conecta o producer Kafka uma vez
(async () => {
  try {
    await producers.connect();
    console.log('Kafka Producer conectado no Gateway');
  } catch (error) {
    console.error('Erro conectando producer:', error);
  }
})();

// Lista de clientes conectados da Cloud (mantida mas não usada)
const cloudClients = new Set<net.Socket>();

// MODIFICADA: Envia para Kafka em vez de TCP
const writeToClouds = async (obj: any) => {
  try {
    await producers.send({
      topic: 'TopicA',
      messages: [{ 
        key: 'gateway', 
        value: JSON.stringify(obj) 
      }]
    });
    console.log('Gateway → Kafka TopicA:', obj);
  } catch (error) {
    console.error('Erro enviando para Kafka:', error);
  }
};

// Conecta a um servidor de bairro (ORIGINAL)
function conectarServidor(host: string, porta: number) {
  const client = net.createConnection({ host, port: porta }, () =>
    console.log(`Conectado ao bairro na porta ${porta}`)
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
        console.log(`Bairro ${porta} ->`, obj);
        writeToClouds({ origem: `bairro_${porta}`, ...obj });
      } catch {
        console.warn('');
      }
    }
  });

  client.on('close', () => console.log(`Conexão fechada com bairro ${porta}`));
  client.on('error', err => console.error(`Erro no bairro ${porta}:`, err.message));
  return client;
}

// Conecta em todos os bairros (ORIGINAL)
[4001,4002,4003,4004,4005].map(p => conectarServidor('127.0.0.1', p));

// Servidor TCP (mantido mas não essencial)
const porta = 4034;
const server = net.createServer(socket => {
  cloudClients.add(socket);
  socket.write(`Conectado ao Gateway. Cliente: ${socket.remoteAddress}:${socket.remotePort}\n`);
  socket.on('data', msg => console.log('Mensagem da Cloud:', msg.toString('utf8')));
  socket.on('close', () => {
    cloudClients.delete(socket);
    console.log('Cloud desconectada');
  });
  socket.on('error', err => console.error('Erro no socket da Cloud:', err.message));
});

server.listen(porta, () => console.log(`Gateway rodando na porta ${porta}`));
