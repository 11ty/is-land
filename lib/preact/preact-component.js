import { html, Component } from 'htm/preact';

class Counter extends Component {
  state = {
    value: 0
  };

  increment = () => {
    this.setState(prev => ({ value: prev.value +1 }));
  };

  render(props, state) {
    return html`
      <div>
      <button onClick=${this.increment}>Increment</button>
        Counter: ${state.value}
      </div>
    `;
  }
}

export default function(props) {
  return html`<${Counter} />`;
}