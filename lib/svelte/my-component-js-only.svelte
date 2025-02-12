<script>
let {} = $props();
let count = $state(0);

function onclick() {
  count += 1;
}
</script>

<style>
  h1 { color: red }
</style>

<h1>Hello {name}</h1>

<button {onclick}>
	Clicked {count} {count === 1 ? 'time' : 'times'}
</button>