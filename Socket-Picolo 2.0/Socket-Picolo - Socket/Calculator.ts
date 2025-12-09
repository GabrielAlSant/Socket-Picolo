// Serviço de cálculo via socket que mantém acumuladores em memória e calcula médias das leituras.

import * as net from 'net';


const porta = 4010;


const acumuladores = new Map<string, { sumT:number; sumU:number; sumI:number; count:number }>();

const server = net.createServer(socket => {
  let buffer = ''; 

  socket.write(`Calculator pronto. Conexão de ${socket.remoteAddress}:${socket.remotePort}\n`);

  socket.on('data', (mensagem: Buffer) => {
    
    buffer += mensagem.toString('utf8');
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? ''; 

    for (const linha of parts) {
      const trimmed = linha.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed) as {
          origem?: string; temperatura: number; umidade: number; insolacao: number;
        };

        const origem = obj.origem ?? 'desconhecido';
        
        if ([obj.temperatura, obj.umidade, obj.insolacao].every(v => typeof v === 'number')) {
          const acc = acumuladores.get(origem) ?? { sumT:0, sumU:0, sumI:0, count:0 };
          acc.sumT += obj.temperatura;
          acc.sumU += obj.umidade;
          acc.sumI += obj.insolacao;
          acc.count++;
          acumuladores.set(origem, acc);

          
          const media = {
            temperatura: +(acc.sumT/acc.count).toFixed(2),
            umidade:     +(acc.sumU/acc.count).toFixed(2),
            insolacao:   +(acc.sumI/acc.count).toFixed(2),
            amostras:    acc.count
          };

          if (!socket.destroyed && socket.writable) {
            socket.write(JSON.stringify({ tipo:'media', origem, media }) + '\n');
          }
        }
      } catch {
        
      }
    }
  });

  socket.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ECONNRESET') {
      
    } else {
      
    }
  });
});

server.listen(porta, () => console.log(`[Socket/Calculator] Calculator executando na porta ${porta}`));
