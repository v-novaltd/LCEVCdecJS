# Debugging

## How to inspect the value of private members with DevTools

Normally the value of private members can't be seen in the DevTools, however the value
can be retrieved by calling `_classPrivateFieldGet`. For example, with the following code:

```js
Class A {
  #name = 'Hello World!'

  constructor() {
    ...
  }
}
```

To get the value of the variable `#name` we set a breakpoint in the Class A code 
and run the following command:

```bash
_classPrivateFieldGet(this, _name)
```
