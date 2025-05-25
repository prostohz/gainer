export const buildCompleteGraphs = (edges: string[]) => {
  // Создаём карту смежности
  const adjacencyMap = new Map<string, Set<string>>();

  // Заполняем карту смежности
  edges.forEach((edge) => {
    const [first, second] = edge.split('-');

    if (!adjacencyMap.has(first)) {
      adjacencyMap.set(first, new Set());
    }
    if (!adjacencyMap.has(second)) {
      adjacencyMap.set(second, new Set());
    }

    adjacencyMap.get(first)!.add(second);
    adjacencyMap.get(second)!.add(first);
  });

  const visited = new Set<string>();
  const completeGraphs: string[][] = [];

  // Для каждой вершины находим полносвязный граф, в котором она участвует
  for (const vertex of adjacencyMap.keys()) {
    if (visited.has(vertex)) continue;

    // Начинаем с текущей вершины
    const potentialClique = [vertex];
    const neighbors = Array.from(adjacencyMap.get(vertex) || []);

    // Проверяем каждого соседа
    for (const neighbor of neighbors) {
      // Проверяем, связан ли сосед со всеми вершинами в потенциальном клике
      let isComplete = true;
      for (const cliqueVertex of potentialClique) {
        if (!adjacencyMap.get(neighbor)?.has(cliqueVertex)) {
          isComplete = false;
          break;
        }
      }

      if (isComplete) {
        potentialClique.push(neighbor);
      }
    }

    // Если нашли клику размером больше 1, добавляем её
    if (potentialClique.length > 1) {
      completeGraphs.push(potentialClique);
      potentialClique.forEach((v) => visited.add(v));
    }
  }

  return completeGraphs;
};
