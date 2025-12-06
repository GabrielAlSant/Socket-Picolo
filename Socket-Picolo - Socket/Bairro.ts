// Importa a lib nativa de TCP do Node
import * as net from 'net';

// Porta passada via argumento de linha de comando, ex: `ts-node Bairro.ts 4001`
const porta: number = parseInt(process.argv[2] || '4001');

// Cria um servidor TCP
const server: net.Server = net.createServer((socket: net.Socket) => {
  // Variáveis que vão armazenar os dados simulados
  let temperatura = 0;
  let umidade = 0;
  let insolacao = 0;
  let intervalId: NodeJS.Timeout; // para parar quando cliente desconectar

  // Função que gera e envia dados fake de clima
  function gerarDados() {
    // Para de enviar se o socket já foi fechado ou não aceita escrita
    if (socket.destroyed || !socket.writable) {
      clearInterval(intervalId);
      return;
    }
    // Gera valores aleatórios com duas casas decimais
    temperatura = parseFloat((Math.random() * 40).toFixed(2));
    umidade = parseFloat((Math.random() * 100).toFixed(2));
    insolacao = parseFloat((Math.random() * 1000).toFixed(2));

    // Monta o objeto que vai pro Gateway
    const payload = { temperatura, umidade, insolacao };
    // Envia como JSON em NDJSON (linha por mensagem)
    socket.write(JSON.stringify(payload) + '\n', err => {
      if (err) console.error('Erro ao enviar dados:', err.message);
    });
  }

  // Dispara a geração a cada 5 segundos
  intervalId = setInterval(gerarDados, 5000);

  // Mensagem inicial para o cliente que acabou de conectar
  socket.write(
    `Conectado no bairro (porta ${porta}). Cliente: ${socket.remoteAddress}:${socket.remotePort}\n`
  );

  // Loga o que o cliente mandar (se mandar)
  socket.on('data', (mensagem: Buffer) => {
    console.log('Cliente diz:', mensagem.toString('utf8'));
  });

  // Quando o cliente encerra a conexão de forma normal
  socket.on('end', () => {
    clearInterval(intervalId);
    console.log('Cliente finalizou a conexão');
  });

  // Quando o socket fecha (normal ou não)
  socket.on('close', () => {
    clearInterval(intervalId);
    console.log('Conexão fechada');
  });

  // Erros de rede
  socket.on('error', (err: NodeJS.ErrnoException) => {
    clearInterval(intervalId);
    if (err.code === 'ECONNRESET') {
      console.warn('Conexão resetada pelo cliente');
    } else {
      console.error('Erro no socket:', err.message);
    }
  });
});

// Sobe o servidor
server.listen(porta, () => {
  console.log(`Servidor de bairro rodando na porta ${porta}`);
});
