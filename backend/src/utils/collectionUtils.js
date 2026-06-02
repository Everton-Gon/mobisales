// Encontra um item por ID em uma coleção
export function findById(collection, id) {
  return collection.find((item) => Number(item.id) === Number(id));
}

// Gera próximo ID baseado no máximo atual da coleção
export function nextId(collection) {
  return collection.length > 0 ? Math.max(...collection.map((item) => Number(item.id))) + 1 : 1;
}
