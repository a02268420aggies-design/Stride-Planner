const tasksArray = [{ id: '1', todo_rank: null }];
const explicitIds = new Set();
const todoRenderSlots = Array.from({ length: Math.max(9, tasksArray.length) }).map((_, i) => {
    const explicit = tasksArray.find(t => t.todo_rank === i);
    if (explicit) {
        explicitIds.add(explicit.id);
        return explicit;
    }
    return null;
});

const unrankedTodos = tasksArray.filter(t => !explicitIds.has(t.id));

const finalSlots = todoRenderSlots.map((slot, i) => {
    if (slot) return slot;
    if (unrankedTodos.length > 0) return unrankedTodos.shift();
    return { id: \empty-todo-slot-\\, is_empty: true };
});

console.log(finalSlots);
