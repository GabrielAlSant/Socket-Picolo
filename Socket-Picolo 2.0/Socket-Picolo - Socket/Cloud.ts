// Serviço cloud que recebe os resultados de cálculo e os disponibiliza/armazenar para consumo externo.

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const banco_dados = path.join(process.cwd(), 'banco.ndjson');


function conectarServidor(host: string, porta: number) {
  const client = net.createConnection({ host, port: porta }, () =>
    console.log(`[Socket/Cloud] Conectado ao servidor na porta ${porta}`)
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

        
        fs.appendFile(banco_dados, JSON.stringify(obj) + '\n', err => {
          if (err) console.error('Erro ao salvar no arquivo da Cloud:', err.message);
        });

        
        escreverSeConectado(calculator, JSON.stringify(obj) + '\n');

      } catch {
        console.warn('Linha inválida recebida do Gateway:', trimmed);
      }
    }
  });

  client.on('close', () => console.log(`[Socket/Cloud] Conexão fechada com servidor ${porta}`));
  client.on('error', err => console.error(`Erro no servidor ${porta}:`, err.message));
  return client;
}



conectarServidor('127.0.0.1', 4034);


const calculator = net.createConnection({ host: '127.0.0.1', port: 4010 }, () =>
  console.log('[Socket/Cloud] Conectado ao Calculator (4010)')
);


function escreverSeConectado(socket: net.Socket, data: string) {
  if (!socket.destroyed && socket.writable) socket.write(data);
}


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
          `[Socket/Cloud] Média (${obj.origem}) -> T:${obj.media.temperatura}°C U:${obj.media.umidade}% I:${obj.media.insolacao} W/m² (amostras: ${obj.media.amostras})`
        );
      }
    } catch {
      console.warn('Linha inválida recebida do Calculator:', trimmed);
    }
  }
});
