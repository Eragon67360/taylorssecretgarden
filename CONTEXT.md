# Taylor's Secret Garden

A Taylor Swift fan site: her music catalogue, her tours, and Swiftter, a small feed where fans post. It is also a portfolio showcase, so craft and polish matter as much as content.

## Catalogue

**Era**:
One album cycle of Taylor Swift's career (e.g. Fearless, Red, 1989), and the unit that carries a visual identity: its own palette and display typeface.
_Avoid_: Theme, album (when meaning the cycle)

**Album**:
A released record belonging to exactly one Era. A Taylor's Version re-recording is a separate Album in the same Era as the original; The Tortured Poets Department and its Anthology edition are one Era. An Album is shown in its most complete edition (e.g. Midnights as The Til Dawn Edition).
_Avoid_: Record, release

**Version**:
Another release of an Album on Deezer: its other editions (standard, international, 3am…), a live or acoustic album, a "Chapter" compilation. Opening an Album on Music lists its Versions; each opens the same Album, in its Era, on that Version's tracklist. Karaoke releases, playlists and one song's remixes are not Versions.
_Avoid_: Edition (when meaning any Version), variant

**Taylor's Version**:
A re-recording of an earlier Album. It belongs to the original Album's Era and uses that Era's look.

**Tour**:
A concert tour, tied to one Era, except the Eras Tour, which spans every Era and has its own look.
_Avoid_: Show, concert (a Tour is made of many shows)

## Swiftter

**Swiftter**:
The site's fan feed, where Members publish Posts.
_Avoid_: Forum

**Post**:
A single rich-text message a Member publishes on Swiftter. Its Member can delete it ("tear up" in the interface); Posts cannot be edited.
In the interface a Post (and a Reply) is a **note**, passed like a note in class: "Pass a note", "older notes", "Tear up this note?". "Post" is the domain term, for the code, the API and these docs; the pages never say it.
_Avoid_: Tweet, message, swift

**Reply**:
A Post answering another Post or reply, in the thread of the first Post. Moderated like a Post.
_Avoid_: Comment

**Reshare**:
A Member passing someone else's public Post on to the feed, credited to its author. It has no text of its own.
_Avoid_: Retweet, repost, share

**Held note**:
A Post or reply that is not public: waiting for a moderation check (pending), or refused (blocked). Only its author sees it.
_Avoid_: Draft, hidden post

**Report**:
A Member asking a human to look at someone else's public note ("Report" in the interface), with a reason if they like. One per Member and note; the owner hears of it in the hourly owner alert.
_Avoid_: Flag, complaint

**Appeal**:
A Member asking a human to look again at their own refused note ("Ask a human to look again" in the interface). One per note.
_Avoid_: Dispute, review request

**Owner alert**:
What the site sends its owner when something needs a human: notes given up on, and new Reports and Appeals. A GitHub issue on the (public) repository when a token is set, so it names notes by id only; otherwise a log line.

**Member**:
A signed-in person who can publish Posts on Swiftter.
_Avoid_: User, account, profile

**Guestbook**:
The sign-up and sign-in pages, styled as a book fans sign. Signing it (email and password, or Google) makes a visitor a Member.
_Avoid_: Login, registration (in the interface)

**Demo content**:
The fictional demo Members and their Posts (`is_demo`), shown on the live site on purpose and labelled "Demo", so the feed is never empty. `npm run db:seed` adds them, `npm run db:unseed` removes them.
_Avoid_: Fake posts

**Seed content**:
The development fixtures (`is_seed`): fictional accounts and notes in every state, loaded by `npm run seed` into development and CI branches only, never production. Not the Demo content.
_Avoid_: Test data (when meaning these)
