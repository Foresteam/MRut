#pragma once
#include <exception>

#define TSTACKITEM template<typename Item>
#define TSTACKNODEITEM template<typename ITEM>

TSTACKITEM class Stack {
private:
	TSTACKNODEITEM struct Node {
		ITEM data;
		Node<ITEM>* next;
		Node(ITEM data, Node<ITEM>* next = nullptr);
	};

	Node<Item>* self;
	size_t size;
public:
	/// @brief Swaps two nodes
	static void Swap(Node<Item>* a, Node<Item>* b);

	Stack();

	/// @brief Adds an item
	void Push(Item item);
	/// @brief Drops the top item
	/// @throws StackUnderflow
	void Drop();
	/// @brief Drops the top item and returns it
	/// @returns The top item
	/// @throws StackUnderflow
	Item Pop();
	/// @brief Returns the top item without dropping it
	/// @returns The top item
	Item* Peek();
	/// @brief Duplicates the top item
	void Dup();
	/// @brief Swaps the top two items
	void Swap();
	/// @brief Rotates the top three items: 123 => 231
	void Rot();
	/// @brief Flips the stack
	void Flip();
	/// @returns If the stack is empty
	bool IsEmpty();

	/// @returns The size of the stack (number of items)
	size_t GetSize();
};