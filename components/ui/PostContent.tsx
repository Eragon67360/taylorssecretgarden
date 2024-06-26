'use client'

import DOMPurify from "isomorphic-dompurify";

const PostContent = ({ content }: { content: string }) => {
  const createMarkup = () => {
    return { __html: DOMPurify.sanitize(content) };
  };

  return <div dangerouslySetInnerHTML={createMarkup()} />;
};

export default PostContent;
