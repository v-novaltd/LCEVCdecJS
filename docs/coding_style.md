# Coding style

The coding style we follow is based on the Airbnb style with some custom
modifications.

## Linter

The first step of the pipeline will lint the files. It checks that changes submitted are complying with repo rules. For `js` and `ts` files it uses the Airbnb coding style with some
modifications.

## Javascript or Typescript?

We are changing the code to TypeScript, so new modules should be coded in that
way.

Why Typescript? Because it is static typed and is better to handle large code
base typical problems.

## Public, private and exported functions

To ensure the minifier work as intended we should follow the next rules
for names regarding the type of the member. Every member that starts with
an underscore is going to be mangle.

Exported members are the ones that appear at the public API and their name
should be `camelCase`.

Public members are those ones that can be used between modules. We don't want
that they can be seen outside so their names should be `_camelCase`.

Private members are all of these members that is only used inside of a module.
We follow new standard proposed (is at Stage 3 when this was written), so they
should be `#camelCase`.

This is not check at the linter, so please make sure you follow this convention.

## Why no `continue` support?

The `continue` command for jump to the next iteration on a loop can be useful.
However, most of the time can be ommited if that kind of data is not added
into the data structure or if it added in the middle of the scope of the loop
can be hard to spot.

By default is check as an error, but if by removing it makes the code uglier or
needs to add more complexity, then disable the lint for that line where it is.
