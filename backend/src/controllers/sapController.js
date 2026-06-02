export async function handleGenerateTxt(orderId, body, data) {
  const { useMysql, mysqlService, sapService, mockData, persistenceService } = data;
  
  const result = useMysql
    ? await mysqlService.generateOrderTxt(orderId, body.usuarioId ?? body.userId ?? 2)
    : await sapService.generateOrderTxt(orderId, body.usuarioId ?? body.userId ?? 2);

  if (!useMysql && result.ok) await persistenceService.saveData();

  return {
    ...result,
    status: result.ok ? 200 : 404,
    message: result.ok ? result : { message: result.error }
  };
}

export async function handleImportSapReturn(body, data) {
  const { useMysql, mysqlService, sapService, persistenceService } = data;
  
  const result = useMysql
    ? await mysqlService.importSapReturn(body.fileName)
    : await sapService.importSapReturn(body.fileName);

  if (!useMysql && result.ok) await persistenceService.saveData();

  return {
    ...result,
    status: result.ok ? 200 : 400,
    message: result.ok ? result : { message: result.error }
  };
}
