# Frontend

Aplicação React/Vite da força de vendas.

## Rodar localmente

```powershell
npm install
npm run dev -- --port 5173
```

Acesse:

```text
http://127.0.0.1:5173
```

## Arquivos principais

- `src/main.jsx`: guarda o usuário logado e escolhe a visão por perfil.
- `src/api.js`: funções para chamar a API Node.
- `src/components/LayoutBase.jsx`: topo com marca, usuário e botão sair.
- `src/components/MenuLateral.jsx`: menu lateral recolhível no desktop e off-canvas no celular.
- `src/components/BadgeStatus.jsx`: etiqueta visual dos status dos pedidos.
- `src/pages/TelaLogin.jsx`: formulário de login.
- `src/pages/DashboardVendedor.jsx`: visão principal do representante.
- `src/pages/FormPedido.jsx`: criação de pedido.
- `src/pages/PaginaCarga.jsx`: geração de TXT e acompanhamento de pedidos pendentes.
- `src/pages/DashboardAdmin.jsx`: visão admin existente; não alterar sem pedido explícito.
- `src/styles.css`: design, responsividade e ajustes mobile/tablet/desktop.

## Visão do representante

A visão do representante tem as seguintes áreas:

- Dashboard com indicadores e gráficos.
- Clientes vinculados ao vendedor.
- Produtos e preços da tabela selecionada.
- Novo pedido.
- Meus pedidos.
- Relatórios com downloads.
- Gerar Carga para criar TXT do SAP.

## Responsividade

A responsividade está concentrada em `src/styles.css`.

Comportamento esperado:

- Desktop: menu lateral completo ou recolhido.
- Notebook/tablet: conteúdo se ajusta em grids menores.
- Smartphone: botão hambúrguer abre o menu lateral por cima da tela.
- Tabelas ficam com rolagem horizontal quando não couberem.

## Comunicação com API

O frontend usa `src/api.js` para chamar o backend em:

```text
http://localhost:3333/api
```

Se a API estiver em outra porta, altere a constante `API_URL` nesse arquivo.
