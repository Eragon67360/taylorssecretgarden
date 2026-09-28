"use client";

// Quill's stylesheet is imported here, in the lazily loaded editor chunk,
// rather than by the Swiftter page: a route-level stylesheet is preloaded
// whenever a nav link prefetches /swiftter, and Chrome then warns on every
// other page that the preloaded stylesheet went unused.
import { useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";

type PostEditorProps = ReactQuill.ReactQuillProps & {
	/** Accessible name of the editing area. */
	label: string;
};

export default function PostEditor({ label, ...props }: PostEditorProps) {
	const ref = useRef<ReactQuill>(null);

	// Quill renders a bare contenteditable div; give it a textbox role and name.
	useEffect(() => {
		const root = ref.current?.getEditor().root;

		root?.setAttribute("role", "textbox");
		root?.setAttribute("aria-multiline", "true");
		root?.setAttribute("aria-label", label);
	}, [label]);

	return <ReactQuill ref={ref} {...props} />;
}
