<script>
  // if you want to allow overrides via props, use export
  // export let name = 'world';
  let name = 'world';

  let count = 0;

  function handleClick() {
    count += 1;
  }
</script>

<style>
  h1 { color: red }
</style>

<h1>Hello {name}!</h1>

<button on:click={handleClick}>
	Clicked {count} {count === 1 ? 'time' : 'times'}
</button>