import { Injectable } from '@nestjs/common';

export enum OrderState {
  GATHERING_INFO = 'GATHERING_INFO',
  REVIEW = 'REVIEW',
  CONFIRMED = 'CONFIRMED',
}

@Injectable()
export class OrderStateMachine {
  private readonly transitions: Record<OrderState, OrderState[]> = {
    [OrderState.GATHERING_INFO]: [OrderState.REVIEW],
    [OrderState.REVIEW]: [OrderState.GATHERING_INFO, OrderState.CONFIRMED],
    [OrderState.CONFIRMED]: [],
  };

  isValidTransition(from: OrderState, to: OrderState): boolean {
    return this.transitions[from].includes(to);
  }

  getNextState(currentState: OrderState, event: 'VALIDATE' | 'CONFIRM' | 'EDIT'): OrderState {
    switch (event) {
      case 'VALIDATE':
        return OrderState.REVIEW;
      case 'CONFIRM':
        return OrderState.CONFIRMED;
      case 'EDIT':
        return OrderState.GATHERING_INFO;
      default:
        return currentState;
    }
  }
}
