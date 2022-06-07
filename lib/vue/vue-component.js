export default {
  data: () => ({ count: 1 }),
  template: `<button @click="count++">⬆️</button> <button @click="count--">⬇️</button> {{ count }}`
};