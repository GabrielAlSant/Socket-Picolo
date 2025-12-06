start cmd /k "docker compose up"
timeout /t 2
start cmd /k "npx ts-node bairro.ts  4001"
start cmd /k "npx ts-node bairro.ts  4002"
start cmd /k "npx ts-node bairro.ts  4003"
start cmd /k "npx ts-node bairro.ts  4004"
start cmd /k "npx ts-node bairro.ts  4005"
timeout /t 2
start cmd /k "npx ts-node calculator.ts"
timeout /t 2
start cmd /k "npx ts-node gateway.ts"
timeout /t 2
start cmd /k "npx ts-node cloud.ts"

/pause