export default function IconEthereum({ size = '32px' }:{ size?: string; }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 512 512" style={
      {
        width: size,
        height: size,
      }
    }>
      <path fill="#3C3C3B" d="m256 362v107l131-185z" />
      <path fill="#343434" d="m256 41l131 218-131 78-132-78" />
      <path fill="#8C8C8C" d="m256 41v158l-132 60m0 25l132 78v107" />
      <path fill="#141414" d="m256 199v138l131-78" />
      <path fill="#393939" d="m124 259l132-60v138" />
    </svg>
  );
}
