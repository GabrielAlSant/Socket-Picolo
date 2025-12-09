start cmd /k "npx ts-node bairro.ts 4001"
start cmd /k "npx ts-node bairro.ts 4002"
timeout /t 2
start cmd /k "npx ts-node calculator.ts"
timeout /t 2
start cmd /k "npx ts-node gateway.ts"
timeout /t 2
start cmd /k "npx ts-node cloud.ts"

/pause