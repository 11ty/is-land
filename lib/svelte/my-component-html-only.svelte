<script>
  // using export to allow overrides via props
  export let name = 'from Svelte';
</script>

<style>
  h1 { color: blue }
</style>

<h1>Hello {name}</h1>