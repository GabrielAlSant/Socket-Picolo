import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const banco_dados = path.join(process.cwd(), 'banco.ndjson');

// Função que conecta em um servidor TCP (Gateway)
function conectarServidor(host: string, porta: number) {
  const client = net.createConnection({ host, port: porta }, () =>
    console.log(`Conectado ao servidor na porta ${porta}`)
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

        // Salva sempre o dado bruto recebido
        fs.appendFile(banco_dados, JSON.stringify(obj) + '\n', err => {
          if (err) console.error('Erro ao salvar no arquivo da Cloud:', err.message);
        });

        // Envia para o Calculator para cálculo de médias
        escreverSeConectado(calculator, JSON.stringify(obj) + '\n');

      } catch {
        console.warn('Linha inválida recebida do Gateway:', trimmed);
      }
    }
  });

  client.on('close', () => console.log(`Conexão fechada com servidor ${porta}`));
  client.on('error', err => console.error(`Erro no servidor ${porta}:`, err.message));
  return client;
}


// Conecta no Gateway
conectarServidor('127.0.0.1', 4034);

// Conecta no Calculator (para receber médias)
const calculator = net.createConnection({ host: '127.0.0.1', port: 4010 }, () =>
  console.log('Conectado ao Calculator (4010)')
);

// Helper para escrever em um socket de forma segura
function escreverSeConectado(socket: net.Socket, data: string) {
  if (!socket.destroyed && socket.writable) socket.write(data);
}

// Recebe resultados de média do Calculator e exibe
let calcBuffer = '';
calculator.on('data', (mensagem: Buffer) => {
  calcBuffer += mensagem.toString('utf8');
  const parts = calcBuffer.split('\n');
  calcBuffer = parts.pop() ?? '';
  for (const linha of parts) {
    const trimmed = linha.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.tipo === 'media' && obj.origem && obj.media) {
        console.log(
          `Média (${obj.origem}) -> T:${obj.media.temperatura}°C U:${obj.media.umidade}% I:${obj.media.insolacao} W/m² (amostras: ${obj.media.amostras})`
        );
      }
    } catch {
      console.warn('Linha inválida recebida do Calculator:', trimmed);
    }
  }
});
