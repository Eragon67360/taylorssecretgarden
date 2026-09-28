"use client";

// Quill's stylesheet is imported here, in the lazily loaded editor chunk,
// rather than by the Swiftter page: a route-level stylesheet is preloaded
// whenever a nav link prefetches /forum, and Chrome then warns on every other
// page that the preloaded stylesheet went unused.
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";

export default function PostEditor(props: ReactQuill.ReactQuillProps) {
  return <ReactQuill {...props} />;
}
