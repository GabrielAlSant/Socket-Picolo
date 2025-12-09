// Simula um bairro gerando leituras de sensores climáticos e enviando via TCP para o gateway.

import * as net from 'net';


const porta: number = parseInt(process.argv[2] || '4001');


const server: net.Server = net.createServer((socket: net.Socket) => {
  
  let temperatura = 0;
  let umidade = 0;
  let insolacao = 0;
  let intervalId: NodeJS.Timeout; 

  
  function gerarDados() {
    
    if (socket.destroyed || !socket.writable) {
      clearInterval(intervalId);
      return;
    }
    
    temperatura = parseFloat((Math.random() * 40).toFixed(2));
    umidade = parseFloat((Math.random() * 100).toFixed(2));
    insolacao = parseFloat((Math.random() * 1000).toFixed(2));

    
    const payload = { temperatura, umidade, insolacao };
    
    socket.write(JSON.stringify(payload) + '\n', err => {
      if (err) console.error('Erro ao enviar dados:', err.message);
    });
  }

  
  intervalId = setInterval(gerarDados, 5000);

  
  socket.write(
    `Conectado no bairro (porta ${porta}). Cliente: ${socket.remoteAddress}:${socket.remotePort}\n`
  );

  
  socket.on('data', (mensagem: Buffer) => {
    console.log('[Socket/Bairro] Cliente diz:', mensagem.toString('utf8'));
  });

  
  socket.on('end', () => {
    clearInterval(intervalId);
    console.log('[Socket/Bairro] Cliente finalizou a conexão');
  });

  
  socket.on('close', () => {
    clearInterval(intervalId);
    console.log('[Socket/Bairro] Conexão fechada');
  });

  
  socket.on('error', (err: NodeJS.ErrnoException) => {
    clearInterval(intervalId);
    if (err.code === 'ECONNRESET') {
      console.warn('Conexão resetada pelo cliente');
    } else {
      console.error('Erro no socket:', err.message);
    }
  });
});


server.listen(porta, () => {
  console.log(`[Socket/Bairro] Servidor de bairro rodando na porta ${porta}`);
});
