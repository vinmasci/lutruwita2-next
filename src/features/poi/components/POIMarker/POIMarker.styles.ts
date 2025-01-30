import styled, { css } from 'styled-components';

// Global styles to be added to the app's stylesheet
export const markerStyles = css`
  .poi-marker {
    .poi-marker-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      transition: all 0.2s ease-in-out;
      
      svg {
        transition: all 0.2s ease-in-out;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));

        &.selected {
          transform: scale(1.2);
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
        }
      }
    }

    &:hover .poi-marker-container svg {
      transform: scale(1.1);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    &.selected .poi-marker-container svg {
      transform: scale(1.2);
      filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
    }

    &.dragging .poi-marker-container svg {
      transform: scale(1.2);
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }
  }
`;

// Styled component for the popup content
export const PopupContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 12px;
  max-width: 240px;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
  }

  p {
    margin: 0 0 8px;
    font-size: 14px;
    color: #666;
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 8px;

    img {
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 4px;
    }
  }
`;
