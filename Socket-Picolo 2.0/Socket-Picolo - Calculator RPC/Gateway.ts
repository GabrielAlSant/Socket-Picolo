// Gateway que intermedia o tráfego de leituras entre o bairro e o serviço de cálculo via RPC.

import * as net from 'net';


const cloudClients = new Set<net.Socket>();


const writeToClouds = (obj: unknown) => {
  const data = JSON.stringify(obj) + '\n';
  for (const c of cloudClients) {
    if (!c.destroyed && c.writable) c.write(data);
  }
};


function conectarServidor(host: string, porta: number) {
  const client = net.createConnection({ host, port: porta }, () =>
    console.log(`[RPC/Gateway] Conectado ao bairro na porta ${porta}`)
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
        console.log(`[RPC/Gateway] Bairro ${porta} ->`, obj);
        writeToClouds({ origem: `bairro_${porta}`, ...obj });
      } catch {
        console.warn('');
      }
    }
  });

  client.on('close', () => console.log(`[RPC/Gateway] Conexão fechada com bairro ${porta}`));
  client.on('error', err => console.error(`Erro no bairro ${porta}:`, err.message));
  return client;
}


[4001,4002,4003,4004,4005].map(p => conectarServidor('127.0.0.1', p));


const porta = 4034;
const server = net.createServer(socket => {
  cloudClients.add(socket);
  socket.write(`Conectado ao Gateway. Cliente: ${socket.remoteAddress}:${socket.remotePort}\n`);
  socket.on('data', msg => console.log('[RPC/Gateway] Mensagem da Cloud:', msg.toString('utf8')));
  socket.on('close', () => {
    cloudClients.delete(socket);
    console.log('[RPC/Gateway] Cloud desconectada');
  });
  socket.on('error', err => console.error('Erro no socket da Cloud:', err.message));
});

server.listen(porta, () => console.log(`[RPC/Gateway] Gateway rodando na porta ${porta}`));
