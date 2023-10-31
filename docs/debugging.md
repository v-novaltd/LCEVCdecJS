# Debugging

## How to inspect private members with DevTools

The private members can't be seen in the DevTools, altought, there is a way to
get it value by calling to `_classPrivateFieldGet`. So, if we had the next code:

```js
Class A {
  #name = 'Hello World!'

  constructor() {
    ...
  }
}
```

In order to get the value of the variable `#name` if we set a breakpoint in
some part of the class A code, by running the following command we will retrieve
the value from it:

```bash
_classPrivateFieldGet(this, _name)
```
