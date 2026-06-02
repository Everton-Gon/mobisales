export async function handleGetBootstrap(data) {
  const { useMysql, mysqlService, mockData } = data;
  
  if (useMysql) {
    return { ok: true, bootstrap: await mysqlService.getBootstrap() };
  }
  
  const { users, customers, products, priceTables, priceTableItems, orders, integrationLogs } = mockData;
  const { publicUsers } = await import('../utils/userUtils.js');
  
  return {
    ok: true,
    bootstrap: {
      users: publicUsers(users),
      customers,
      products,
      priceTables,
      priceTableItems,
      orders,
      integrationLogs
    }
  };
}

export async function handleGetData(type, data) {
  const bootstrap = data.useMysql ? await data.mysqlService.getBootstrap() : getJsonBootstrap(data.mockData);

  const mapping = {
    users: bootstrap.users,
    customers: bootstrap.customers,
    products: bootstrap.products,
    'price-tables': { priceTables: bootstrap.priceTables, priceTableItems: bootstrap.priceTableItems },
    'integration-logs': bootstrap.integrationLogs
  };

  return { ok: true, data: mapping[type] };
}

function getJsonBootstrap(mockData) {
  const { publicUsers } = require('../utils/userUtils.js');
  const { users, customers, products, priceTables, priceTableItems, orders, integrationLogs } = mockData;
  
  return {
    users: publicUsers(users),
    customers,
    products,
    priceTables,
    priceTableItems,
    orders,
    integrationLogs
  };
}
