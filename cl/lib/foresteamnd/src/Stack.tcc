#pragma once
#include "Stack.h"

TSTACKITEM TSTACKNODEITEM Stack<Item>::Node<ITEM>::Node(ITEM data, Node<ITEM>* next) {
	this->data = data;
	this->next = next;
}

TSTACKITEM void Stack<Item>::Swap(Node<Item>* a, Node<Item>* b) {
	Node<Item>* t;
	t = b->next;
	b->next = a;
	a->next = t;
}

TSTACKITEM Stack<Item>::Stack() {
	size = 0;
	self = nullptr;
}

TSTACKITEM void Stack<Item>::Push(Item item) {
	self = new Node<Item>(item, self);
	size += 1;
}
/// @throws StackUnderflow
TSTACKITEM void Stack<Item>::Drop() {
	Node<Item>* pt = self;
	self = self->next;
	delete pt;
	this->size -= 1;
}
/// @throws StackUnderflow
TSTACKITEM Item Stack<Item>::Pop() {
	Item r = self->data;
	Drop();

	return r;
}
TSTACKITEM Item* Stack<Item>::Peek() {
	return &self->data;
}
TSTACKITEM void Stack<Item>::Dup() {
	Push(*Peek());
}
TSTACKITEM void Stack<Item>::Swap() {
	Node<Item>*a = self, *b = self->next;
	Stack::Swap(a, b);
	self = b;
}
TSTACKITEM void Stack<Item>::Rot() {
	Node<Item>*a = self, *b = a->next, *c = b->next;
	Stack::Swap(a, c);
	Stack::Swap(b, a);
	self = c;
}
TSTACKITEM void Stack<Item>::Flip() {
	Stack<Item> n;
	while (!IsEmpty())
		n.Push(Pop());
	*this = n;
}
TSTACKITEM bool Stack<Item>::IsEmpty() {
	return self == nullptr;
}

TSTACKITEM size_t Stack<Item>::GetSize() {
	return this->size;
}