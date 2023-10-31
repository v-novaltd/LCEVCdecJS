# Contributing

This document outlines the processes involved for being a cooperative and conscientious contributor to the **LCEVCdec.js**.

The objective of the document is to articulate common guidelines, eliminate misunderstanding and increase efficiency. It
is not meant to hinder good productivity by dictating ways-of-working. However, efficiency is only gained by well
understood common practices, which this document is capturing. Should there be any gaps in what’s described or suggested
improvements, please make recommendations to how this document can be updated to reflect a better working practice. The
document is always maintained under version control in the **LCEVCdec.js** repository.

## Code Contribution

This section describes the high-level process a contributor should go through when **contributing code** to the repository:

- It is the contributor's responsibility to ensure good code hygiene, and follow the best practices determined by the group.

- Always **match the style** of the surrounding code. Typically, mimic **variable/function/class style**, use
  **sensible clear and concise names** for everything. The style rules are mostly the same as the
  [Airbnb style](https://github.com/airbnb/javascript).

- As a fellow contributor it is required that you take a **proactive** attitude towards **reviewing** other Merge Requests.

- The above statement applies generally to the whole repository, you are just as responsible as anyone else to ensure
  that we are all collectively being hygienic with the repository.

- **All work must** be performed on a **separate branch** spawned from **main**, and should be appropriately named
  for simple identification of the work item, i.e. "**{feature_name}**", for example:
  **perfect_time_residuals**. The recommendation is to stick to lower-case characters with underscore separation for words. It should provide a **clear & descriptive** name of the work item for the branch.

- The branch must **ONLY** have functionality changes **pertaining** to the Jira ticket or specific work item. This is
  a firm requirement to make the lives of code reviewers easier. If you identify you need to make **additional changes**
  that do not directly relate to the work in the ticket but you require to progress, then **spawn a separate branch**
  from **main**, make the relevant modifications and launch a **separate Merge Request**. The goal of this is to
  help your fellow contributors perform swift and speedy reviews on bite-sized modifications, rather than monolithic
  sweeping changes.

- As above, if you feel your branch is becoming too big, then figure out a way to break your
  changes up into discrete blocks of functionality across several progressive Merge Requests. This may not always be possible, particularly for quite invasive changes. The goal of this
  is to be mindful of reviewers, and their limited time to perform reviews.

- **Frequently synchronise** your branch against main to ensure you don't diverge too much during development, this
  will help you when you come to merge back in. Noting of course that this may not be possible in some scenarios; such
  as requiring a stable base for metrics or performance optimisation work.

- **Be open** about your changes and ideas up front.

## Commit Messages

Commit messages are an important tool to communicate to your peers and your future self what you have changed and why you
performed the change. They also provide a deeper level of context and reasoning behind the rationale for the changes that
may assist someone significantly in the future.

Each commit message should have a short one-line explanation at the beginning, formed as a sentence (i.e., first word
capitalized and period at the end). If the commit affects only one component, the component name should
be prepended and separated from the rest of the sentence with a colon (and space), where multiple components are touched
then it may be omitted. Below is a detailed example:

    component_name: short one-line summary ending with a period.

    A clear & concise longer description of what changed, including why the change was made, this may be separated over
    several paragraphs.

     - Bullet points, indented with one space before and one space after the bullet, indented to have the text aligned.
     - Bullet points are separated from surrounding text with blank lines.

    It is good to use *emphasise*, _underline_ or `code` as in Markdown, if necessary, but they shouldn't be overused.

        Multi-line code examples are indented with four spaces, as in Markdown syntax.

    Finally list tags with one tag per-line, separated from the commit message body with a blank line before.

An example of a commit message:

    residual_store: Bug fix to layer step-width calculation

    The calculation can quite easily result in step-widths greater than max
    step-width (32768), this is performed in 32 or 64 bit depending on compiler,
    the result is cast...

There is an exception to the above rule, common sense should be applied, typically single line of code changes that are
nominal compilation fixes can contain just a brief description, as these commits should eventually be squashed.

## Pull Requests

We utilise the Pull (Merge) Request feature in GitHub to perform **code reviews**. All changes must go through the review process. The **submitter** is entirely
**responsible** for ensuring that the review is happening in a timely fashion.

Once you have completed your development it is time to submit a merge request, the following steps should be followed:

- **Automated testing** is fundamental to the maintenance of production-ready code. It is entirely your responsibility
  to ensure that your changes are correctly tested. Merge Requests will be held up if there is not a testing component
  associated with it. If the answer to "**have I added to or modified the tests appropriately to cover my changes?**"
  is no then you have not yet finished your development phase, and must go back and implement some form of testing. We have some test suites in the repository under `test/`.

- You should squash as many commits together as makes sense, we don't want to pollute the history with single line
  commits of "fixing CI build for Android" or "oops forgot to save a file". Nothing that we still want to retain the
  core logical progression of changes so that it can still be understood as to how we arrived at a particular solution,
  common sense should be applied, you are the person making the changes you will probably be the person to return to them
  at some point.

- Raise a Merge Request **clear & concise** description of the changes and why you arrived at this solution.

- **Assign** the Merge Request to a peer who is most responsible for the area you are modifying, you can also tag other
  people through a comment to make them aware of your request; it is recommended to do so as it should help speed up the
  process.

- Merge Request submission will automatically trigger the CI system. If compilation fails you
  are responsible for understanding why and resolving.

- After the CI has performed compilation the test suite is run on the artifacts produced, if this fails you are responsible
  for understanding why and resolving.

- Once the CI pipeline is green your fellow contributors will jump into the review (you may need to provide a light nudge
  towards it) where the code-review process will be performed, be prepared to be challenged on your decisions, do not
  take offence if there's a lot of activity here, it probably means you're touching something critical.

- Once all discussion points are completed, and there's a general consensus that the changes are valid, then they can
  be merged, the preference is to use the GitHub interface to perform this.

- Finally, **delete the remote branch** that tracked your work, it is no longer relevant as your
changes are now in the main.