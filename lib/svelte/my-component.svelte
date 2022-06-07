<script>
  // using export to allow overrides via props
  export let name = 'world';

  let count = 0;

  function handleClick() {
    count += 1;
  }
</script>

<style>
  h1 { color: red }
</style>

<h1>Hello {name}</h1>

<button on:click={handleClick}>
	Clicked {count} {count === 1 ? 'time' : 'times'}
</button>